import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Download, RefreshCw, Database, Search } from "lucide-react";

interface ProteinViewer3DProps {
  fastaSequence?: string;
  receptorType?: string;
  pdbId?: string;
  width?: number;
  height?: number;
}

const ProteinViewer3D: React.FC<ProteinViewer3DProps> = ({ 
  fastaSequence, 
  receptorType, 
  pdbId,
  width = 400, 
  height = 300 
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [viewStyle, setViewStyle] = useState('cartoon');
  const [dataSource, setDataSource] = useState<string>('');
  const [customPdbId, setCustomPdbId] = useState<string>('');
  const [proteinInfo, setProteinInfo] = useState<any>(null);

  // Enhanced receptor database with multiple PDB IDs
  const receptorDatabase = {
    'il-6': {
      name: 'IL-6 (Interleukin-6)',
      primaryPdb: '1ALU',
      alternativePdbs: ['1N26', '2IL6', '1IL6'],
      uniprotId: 'P05231',
      description: 'Pro-inflammatory cytokine'
    },
    'il-10': {
      name: 'IL-10 (Interleukin-10)', 
      primaryPdb: '2ILK',
      alternativePdbs: ['1J7V', '1LK3', '1LQS'],
      uniprotId: 'P22301',
      description: 'Anti-inflammatory cytokine'
    },
    'il-17a': {
      name: 'IL-17A (Interleukin-17A)',
      primaryPdb: '4HSA',
      alternativePdbs: ['5C21', '6MZR', '4J2Q'],
      uniprotId: 'Q16552',
      description: 'Pro-inflammatory cytokine'
    },
    'tnf-alpha': {
      name: 'TNF-α (Tumor Necrosis Factor)',
      primaryPdb: '2AZ5',
      alternativePdbs: ['1TNF', '2E7A', '1A8M'],
      uniprotId: 'P01375',
      description: 'Pro-inflammatory cytokine'
    }
  };

  useEffect(() => {
    if (!receptorType && !fastaSequence && !pdbId && !customPdbId) return;
    loadProteinStructure();
  }, [receptorType, fastaSequence, pdbId, customPdbId, viewStyle]);

  const loadProteinStructure = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load 3Dmol.js
      if (!(window as any).$3Dmol) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.0.1/3Dmol-min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 10000);
        });
      }

      const $3Dmol = (window as any).$3Dmol;
      
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        
        const newViewer = $3Dmol.createViewer(viewerRef.current, {
          defaultcolors: $3Dmol.elementColors.rasmol,
          backgroundColor: 'white'
        });

        let structureLoaded = false;

        // Priority 1: Custom PDB ID
        if (customPdbId) {
          const success = await loadPDBStructure(newViewer, customPdbId.toUpperCase());
          if (success) {
            setDataSource(`PDB: ${customPdbId.toUpperCase()}`);
            await fetchProteinInfo(customPdbId.toUpperCase());
            structureLoaded = true;
          }
        }

        // Priority 2: Provided PDB ID
        if (!structureLoaded && pdbId) {
          const success = await loadPDBStructure(newViewer, pdbId);
          if (success) {
            setDataSource(`PDB: ${pdbId}`);
            await fetchProteinInfo(pdbId);
            structureLoaded = true;
          }
        }

        // Priority 3: Receptor type with multiple PDB attempts
        if (!structureLoaded && receptorType && receptorDatabase[receptorType as keyof typeof receptorDatabase]) {
          const receptor = receptorDatabase[receptorType as keyof typeof receptorDatabase];
          
          // Try primary PDB first
          let success = await loadPDBStructure(newViewer, receptor.primaryPdb);
          if (success) {
            setDataSource(`PDB: ${receptor.primaryPdb} (Primary)`);
            await fetchProteinInfo(receptor.primaryPdb);
            structureLoaded = true;
          } else {
            // Try alternative PDBs
            for (const altPdb of receptor.alternativePdbs) {
              success = await loadPDBStructure(newViewer, altPdb);
              if (success) {
                setDataSource(`PDB: ${altPdb} (Alternative)`);
                await fetchProteinInfo(altPdb);
                structureLoaded = true;
                break;
              }
            }
          }
        }

        // Priority 4: Generate from FASTA
        if (!structureLoaded && fastaSequence) {
          const mockStructure = generateFromFastaSequence(fastaSequence);
          newViewer.addModel(mockStructure, 'pdb');
          setDataSource('Generated from FASTA');
          structureLoaded = true;
        }

        // Fallback: Generate basic structure
        if (!structureLoaded) {
          const fallbackStructure = generateFallbackStructure(receptorType || 'protein');
          newViewer.addModel(fallbackStructure, 'pdb');
          setDataSource('Generated Structure');
          structureLoaded = true;
        }

        if (structureLoaded) {
          applyViewStyle(newViewer, viewStyle);
          newViewer.zoomTo();
          newViewer.render();
          setViewer(newViewer);
        }

        setIsLoading(false);
      }

    } catch (err) {
      console.error('Protein structure loading error:', err);
      setError('Unable to load protein structure');
      setIsLoading(false);
    }
  };

  const loadPDBStructure = async (viewer: any, pdbIdToLoad: string): Promise<boolean> => {
    try {
      console.log(`Attempting to load PDB structure: ${pdbIdToLoad}`);
      
      // Try RCSB PDB first
      const pdbUrl = `https://files.rcsb.org/download/${pdbIdToLoad}.pdb`;
      const response = await fetch(pdbUrl);
      
      if (response.ok) {
        const pdbData = await response.text();
        viewer.addModel(pdbData, 'pdb');
        console.log(`Successfully loaded PDB: ${pdbIdToLoad}`);
        return true;
      }
      
      // Try alternative PDB mirror
      const altUrl = `https://www.rcsb.org/structure/${pdbIdToLoad}`;
      const altResponse = await fetch(`https://files.rcsb.org/view/${pdbIdToLoad}.pdb`);
      
      if (altResponse.ok) {
        const pdbData = await altResponse.text();
        viewer.addModel(pdbData, 'pdb');
        console.log(`Successfully loaded PDB from alternative source: ${pdbIdToLoad}`);
        return true;
      }
      
      return false;
    } catch (e) {
      console.log(`PDB ${pdbIdToLoad} failed:`, e);
      return false;
    }
  };

  const fetchProteinInfo = async (pdbIdToFetch: string) => {
    try {
      const infoResponse = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${pdbIdToFetch}`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        setProteinInfo({
          title: info.struct?.title || 'Unknown',
          resolution: info.rcsb_entry_info?.resolution_combined?.[0] || 'N/A',
          method: info.exptl?.[0]?.method || 'Unknown',
          depositionDate: info.rcsb_accession_info?.deposit_date || 'Unknown'
        });
      }
    } catch (e) {
      console.log('Failed to fetch protein info:', e);
    }
  };

  const generateFromFastaSequence = (fasta: string): string => {
    const sequence = fasta.replace(/^>.*\n/, '').replace(/\n/g, '');
    const numResidues = Math.min(sequence.length, 200);
    
    let pdb = 'HEADER    PROTEIN FROM FASTA SEQUENCE\n';
    
    for (let i = 0; i < numResidues; i++) {
      const aa = sequence[i] || 'A';
      const residue = convertAminoAcid(aa);
      
      // Create realistic secondary structure
      const t = i / numResidues;
      let x, y, z;
      
      // Alpha helix regions
      if (i % 20 < 12) {
        const helixAngle = (i * 100 * Math.PI) / 180;
        x = 2.3 * Math.cos(helixAngle);
        y = 2.3 * Math.sin(helixAngle);
        z = i * 1.5;
      } 
      // Beta sheet regions
      else if (i % 20 < 18) {
        x = (i % 8) * 3.5 - 14;
        y = Math.floor(i / 8) * 5;
        z = 100 + Math.sin(i * 0.5) * 2;
      }
      // Loop regions
      else {
        const loopAngle = t * 4 * Math.PI;
        x = 8 * Math.cos(loopAngle);
        y = 8 * Math.sin(loopAngle);
        z = 150 + t * 20;
      }
      
      pdb += generateResidue(residue, i + 1, x, y, z);
    }
    
    pdb += 'END\n';
    return pdb;
  };

  const generateFallbackStructure = (receptorType: string): string => {
    const numResidues = 120;
    let pdb = 'HEADER    GENERATED PROTEIN STRUCTURE\n';
    
    for (let i = 0; i < numResidues; i++) {
      const residueNum = i + 1;
      
      if (i < 30) {
        const phi = (i * 100 * Math.PI) / 180;
        const x = 2.3 * Math.cos(phi);
        const y = 2.3 * Math.sin(phi);
        const z = i * 1.5;
        pdb += generateResidue('ALA', residueNum, x, y, z);
      } else if (i < 60) {
        const x = (i - 30) * 3.5;
        const y = Math.sin((i - 30) * 0.3) * 2;
        const z = 45;
        pdb += generateResidue('VAL', residueNum, x, y, z);
      } else {
        const angle = ((i - 60) / 60) * 2 * Math.PI;
        const radius = 15;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const z = 50 + (i - 60) * 0.5;
        pdb += generateResidue('GLY', residueNum, x, y, z);
      }
    }
    
    pdb += 'END\n';
    return pdb;
  };

  const generateResidue = (residue: string, resNum: number, x: number, y: number, z: number): string => {
    const atomNum = (resNum - 1) * 4;
    return [
      `ATOM  ${(atomNum + 1).toString().padStart(5)} N   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${x.toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           N`,
      `ATOM  ${(atomNum + 2).toString().padStart(5)} CA  ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 1.5).toFixed(3).padStart(8)}${(y + 0.5).toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C`,
      `ATOM  ${(atomNum + 3).toString().padStart(5)} C   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 2.4).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           C`,
      `ATOM  ${(atomNum + 4).toString().padStart(5)} O   ${residue.padEnd(3)} A${resNum.toString().padStart(4)}    ${(x + 3.8).toFixed(3).padStart(8)}${y.toFixed(3).padStart(8)}${z.toFixed(3).padStart(8)}  1.00 20.00           O`,
    ].join('\n') + '\n';
  };

  const convertAminoAcid = (aa: string): string => {
    const aaMap: { [key: string]: string } = {
      'A': 'ALA', 'R': 'ARG', 'N': 'ASN', 'D': 'ASP', 'C': 'CYS',
      'E': 'GLU', 'Q': 'GLN', 'G': 'GLY', 'H': 'HIS', 'I': 'ILE',
      'L': 'LEU', 'K': 'LYS', 'M': 'MET', 'F': 'PHE', 'P': 'PRO',
      'S': 'SER', 'T': 'THR', 'W': 'TRP', 'Y': 'TYR', 'V': 'VAL'
    };
    return aaMap[aa.toUpperCase()] || 'ALA';
  };

  const applyViewStyle = (viewer: any, style: string) => {
    viewer.setStyle({}, {});
    
    switch (style) {
      case 'cartoon':
        viewer.setStyle({}, { 
          cartoon: { 
            color: 'spectrum',
            style: 'trace'
          } 
        });
        break;
      case 'surface':
        viewer.setStyle({}, { 
          surface: { 
            opacity: 0.8, 
            color: 'white'
          } 
        });
        break;
      case 'stick':
        viewer.setStyle({}, { 
          stick: { 
            radius: 0.2,
            colorscheme: 'default'
          } 
        });
        break;
      case 'sphere':
        viewer.setStyle({}, { 
          sphere: { 
            scale: 0.4,
            colorscheme: 'element'
          } 
        });
        break;
    }
    
    viewer.render();
  };

  const resetView = () => {
    if (viewer) {
      viewer.zoomTo();
      viewer.render();
    }
  };

  const downloadImage = () => {
    if (viewer) {
      viewer.pngURI((uri: string) => {
        const link = document.createElement('a');
        link.download = `protein_structure_${receptorType || customPdbId || 'custom'}.png`;
        link.href = uri;
        link.click();
      }, 1200, 900);
    }
  };

  const retry = () => {
    loadProteinStructure();
  };

  const handlePdbSearch = () => {
    if (customPdbId.trim()) {
      loadProteinStructure();
    }
  };

  return (
    <Card className="border border-green-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <Database className="h-4 w-4" />
            Protein Structure Viewer
          </CardTitle>
          <div className="flex gap-2">
            <Select value={viewStyle} onValueChange={setViewStyle}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cartoon">Cartoon</SelectItem>
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="stick">Stick</SelectItem>
                <SelectItem value="sphere">Sphere</SelectItem>
              </SelectContent>
            </Select>
            {error && (
              <Button size="sm" variant="outline" onClick={retry}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={resetView} disabled={isLoading || !!error}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={downloadImage} disabled={isLoading || !!error}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-2">
          <div className="flex-1">
            <Label htmlFor="pdb-search" className="text-xs">Enter PDB ID</Label>
            <div className="flex gap-1">
              <Input
                id="pdb-search"
                placeholder="e.g., 1ALU"
                value={customPdbId}
                onChange={(e) => setCustomPdbId(e.target.value)}
                className="h-8 text-xs"
                maxLength={4}
              />
              <Button size="sm" onClick={handlePdbSearch} disabled={!customPdbId.trim()}>
                <Search className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div 
            ref={viewerRef}
            className="border rounded bg-white"
            style={{ width: '100%', height: `${height}px` }}
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                Loading PDB structure...
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded text-center">
              <div className="text-xs text-red-600 p-4">
                <div className="font-medium">{error}</div>
                <button onClick={retry} className="mt-2 text-blue-600 underline">
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-3 space-y-2">
          <div className="flex gap-2 text-xs flex-wrap">
            <Badge variant="outline">3D Interactive</Badge>
            {dataSource && <Badge variant="secondary">{dataSource}</Badge>}
            <Badge variant="outline">PDB Quality</Badge>
          </div>
          
          {proteinInfo && (
            <div className="text-xs bg-gray-50 p-2 rounded">
              <div><strong>Title:</strong> {proteinInfo.title}</div>
              <div><strong>Resolution:</strong> {proteinInfo.resolution}Å</div>
              <div><strong>Method:</strong> {proteinInfo.method}</div>
              <div><strong>Deposited:</strong> {proteinInfo.depositionDate}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProteinViewer3D;
