
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, FileText, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProteinTargetInputProps {
  onProteinSelected: (data: {
    type: string;
    pdbId?: string;
    fastaSequence?: string;
    customName?: string;
  }) => void;
}

const ProteinTargetInput: React.FC<ProteinTargetInputProps> = ({ onProteinSelected }) => {
  const [selectedType, setSelectedType] = useState('predefined');
  const [pdbId, setPdbId] = useState('');
  const [fastaSequence, setFastaSequence] = useState('');
  const [customName, setCustomName] = useState('');
  const [predefinedTarget, setPredefinedTarget] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const predefinedTargets = {
    'il-6': {
      name: 'IL-6 (Interleukin-6)',
      pdbId: '1ALU',
      description: 'Pro-inflammatory cytokine receptor'
    },
    'il-10': {
      name: 'IL-10 (Interleukin-10)',
      pdbId: '2ILK',
      description: 'Anti-inflammatory cytokine receptor'
    },
    'il-17a': {
      name: 'IL-17A (Interleukin-17A)',
      pdbId: '4HSA',
      description: 'Pro-inflammatory cytokine receptor'
    },
    'tnf-alpha': {
      name: 'TNF-α (Tumor Necrosis Factor)',
      pdbId: '2AZ5',
      description: 'Pro-inflammatory cytokine receptor'
    }
  };

  const validatePdbId = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://data.rcsb.org/rest/v1/core/entry/${id.toUpperCase()}`);
      return response.ok;
    } catch {
      return false;
    }
  };

  const validateFastaSequence = (sequence: string): boolean => {
    const cleanSequence = sequence.replace(/^>.*\n/, '').replace(/\n/g, '');
    const validAA = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
    return cleanSequence.length >= 10 && validAA.test(cleanSequence);
  };

  const handleSubmit = async () => {
    setIsValidating(true);

    try {
      if (selectedType === 'predefined') {
        if (!predefinedTarget) {
          toast({
            title: "Selection Required",
            description: "Please select a predefined protein target.",
            variant: "destructive"
          });
          return;
        }

        const target = predefinedTargets[predefinedTarget as keyof typeof predefinedTargets];
        onProteinSelected({
          type: predefinedTarget,
          pdbId: target.pdbId,
          customName: target.name
        });

        toast({
          title: "Protein Target Selected",
          description: `${target.name} (PDB: ${target.pdbId}) selected successfully.`
        });
        
      } else if (selectedType === 'custom') {
        if (!pdbId && !fastaSequence) {
          toast({
            title: "Input Required",
            description: "Please provide either a PDB ID or FASTA sequence.",
            variant: "destructive"
          });
          return;
        }

        let validPdb = true;
        if (pdbId) {
          validPdb = await validatePdbId(pdbId);
          if (!validPdb) {
            toast({
              title: "Invalid PDB ID",
              description: "The provided PDB ID could not be validated.",
              variant: "destructive"
            });
            return;
          }
        }

        if (fastaSequence && !validateFastaSequence(fastaSequence)) {
          toast({
            title: "Invalid FASTA Sequence",
            description: "Please provide a valid protein FASTA sequence (minimum 10 amino acids).",
            variant: "destructive"
          });
          return;
        }

        onProteinSelected({
          type: 'custom',
          pdbId: pdbId || undefined,
          fastaSequence: fastaSequence || undefined,
          customName: customName || 'Custom Protein Target'
        });

        toast({
          title: "Custom Protein Target Set",
          description: `Target configured with ${pdbId ? `PDB: ${pdbId}` : ''}${pdbId && fastaSequence ? ' and ' : ''}${fastaSequence ? 'FASTA sequence' : ''}.`
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to validate protein target input.",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Card className="border-green-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Database className="h-5 w-5" />
          Enhanced Protein Target Input
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predefined">Predefined Targets</TabsTrigger>
            <TabsTrigger value="custom">Custom Input</TabsTrigger>
          </TabsList>

          <TabsContent value="predefined" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Protein Target</Label>
              <Select value={predefinedTarget} onValueChange={setPredefinedTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a protein target" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(predefinedTargets).map(([key, target]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col">
                        <span className="font-medium">{target.name}</span>
                        <span className="text-xs text-gray-500">PDB: {target.pdbId} - {target.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {predefinedTarget && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800">
                    {predefinedTargets[predefinedTarget as keyof typeof predefinedTargets].name}
                  </h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">PDB: {predefinedTargets[predefinedTarget as keyof typeof predefinedTargets].pdbId}</Badge>
                    <Badge variant="secondary">Validated Structure</Badge>
                  </div>
                  <p className="text-sm text-green-600">
                    {predefinedTargets[predefinedTarget as keyof typeof predefinedTargets].description}
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-name">Custom Target Name (Optional)</Label>
                <Input
                  id="custom-name"
                  placeholder="e.g., My Custom Protein"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdb-id">PDB ID (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="pdb-id"
                    placeholder="e.g., 1ALU"
                    value={pdbId}
                    onChange={(e) => setPdbId(e.target.value.toUpperCase())}
                    maxLength={4}
                  />
                  <Button size="sm" variant="outline" disabled={!pdbId || isValidating}>
                    <Search className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter a 4-character PDB ID to fetch the 3D structure from the Protein Data Bank
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fasta-sequence">FASTA Sequence (Optional)</Label>
                <Textarea
                  id="fasta-sequence"
                  placeholder=">Protein Name&#10;MAEGEITTFTALTEKFNLPPGNYKKPKLLYCSNGGHFLRILPDGTVDGTRDRSDQHIQLQLSAESVGEVYIKSTETGQYLAMDTSGLLYGSQTEP..."
                  value={fastaSequence}
                  onChange={(e) => setFastaSequence(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Provide a protein FASTA sequence for structure prediction and analysis
                </p>
              </div>

              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-800">Enhanced Input Options</h4>
                    <p className="text-sm text-blue-600 mt-1">
                      You can provide both PDB ID and FASTA sequence for maximum accuracy. 
                      The PDB structure will be used for 3D visualization while the FASTA sequence 
                      will be used for sequence-based predictions.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Button 
            onClick={handleSubmit}
            disabled={isValidating || (selectedType === 'predefined' && !predefinedTarget) || (selectedType === 'custom' && !pdbId && !fastaSequence)}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isValidating ? 'Validating...' : 'Set Protein Target'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProteinTargetInput;
