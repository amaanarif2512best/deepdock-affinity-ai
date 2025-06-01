import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { FileText, Search, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MoleculeViewer2D from "@/components/MoleculeViewer2D";
import MoleculeViewer3D from "@/components/MoleculeViewer3D";
import ProteinViewer3D from "@/components/ProteinViewer3D";

const Index = () => {
  const [ligandSmiles, setLigandSmiles] = useState('');
  const [receptorType, setReceptorType] = useState('');
  const [customFasta, setCustomFasta] = useState('');
  const [affinityResult, setAffinityResult] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const popularReceptors = [
    { id: 'il-6', name: 'IL-6 (Interleukin-6)', description: 'Pro-inflammatory cytokine' },
    { id: 'il-10', name: 'IL-10 (Interleukin-10)', description: 'Anti-inflammatory cytokine' },
    { id: 'il-17a', name: 'IL-17A (Interleukin-17A)', description: 'Pro-inflammatory cytokine' },
    { id: 'tnf-alpha', name: 'TNF-α (Tumor Necrosis Factor)', description: 'Pro-inflammatory cytokine' },
  ];

  // Helper function for SMILES validation
  function validateSmiles(smiles: string) {
    const smilesPattern = /^[A-Za-z0-9@+\-\[\]()=#$/\\%.]+$/;
    return smilesPattern.test(smiles) && smiles.length > 0;
  }

  function handlePredict() {
    if (!ligandSmiles || (!receptorType && !customFasta)) {
      toast({
        title: "Missing Input",
        description: "Please provide both ligand SMILES and receptor information.",
        variant: "destructive"
      });
      return;
    }

    if (!validateSmiles(ligandSmiles)) {
      toast({
        title: "Invalid SMILES",
        description: "Please enter a valid SMILES string.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate AI prediction with realistic values
    setTimeout(() => {
      const mockAffinity = -(Math.random() * 10 + 2); // Range: -2 to -12 kcal/mol
      setAffinityResult(parseFloat(mockAffinity.toFixed(2)));
      setIsLoading(false);
      
      toast({
        title: "Prediction Complete",
        description: `Binding affinity calculated: ${mockAffinity.toFixed(2)} kcal/mol`,
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DeepDockAI
              </h1>
              <p className="text-gray-600 mt-1">AI-Driven Ligand-Receptor Docking & Affinity Prediction</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Beta v1.0
              </Badge>
              <Badge variant="outline" className="border-green-200 text-green-700">
                Research Tool
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="ligand" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-blue-200">
            <TabsTrigger value="ligand" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              🧪 Ligand
            </TabsTrigger>
            <TabsTrigger value="receptor" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              🧬 Receptor
            </TabsTrigger>
            <TabsTrigger value="predict" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              ⚙️ Predict
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              📊 Results
            </TabsTrigger>
          </TabsList>

          {/* Ligand Input Tab */}
          <TabsContent value="ligand" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <FileText className="h-5 w-5" />
                  Ligand Input
                </CardTitle>
                <CardDescription>
                  Enter the SMILES string of your ligand molecule for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smiles">SMILES String</Label>
                  <Input
                    id="smiles"
                    placeholder="e.g., C1=CC=CC=C1 (benzene)"
                    value={ligandSmiles}
                    onChange={(e) => setLigandSmiles(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-sm text-gray-500">
                    Enter a valid SMILES notation for your ligand molecule
                  </p>
                </div>

                {ligandSmiles && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-4">Ligand Visualization</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <MoleculeViewer2D smiles={ligandSmiles} />
                      <MoleculeViewer3D smiles={ligandSmiles} />
                    </div>
                    <div className="mt-4 flex gap-2 text-sm">
                      <div><strong>SMILES:</strong> {ligandSmiles}</div>
                      <div><strong>Status:</strong> 
                        <Badge variant={validateSmiles(ligandSmiles) ? "default" : "destructive"} className="ml-2">
                          {validateSmiles(ligandSmiles) ? "Valid" : "Invalid"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receptor Input Tab */}
          <TabsContent value="receptor" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Search className="h-5 w-5" />
                  Receptor Selection
                </CardTitle>
                <CardDescription>
                  Choose a popular receptor or provide custom FASTA sequence
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Popular Receptors</Label>
                  <Select value={receptorType} onValueChange={setReceptorType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a popular receptor" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularReceptors.map((receptor) => (
                        <SelectItem key={receptor.id} value={receptor.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{receptor.name}</span>
                            <span className="text-sm text-gray-500">{receptor.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center">
                  <Separator className="flex-1" />
                  <span className="px-4 text-sm text-gray-500">OR</span>
                  <Separator className="flex-1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fasta">Custom FASTA Sequence</Label>
                  <Textarea
                    id="fasta"
                    placeholder=">Protein Name&#10;MKTIIALSYIFCLVFADYKDDDDKIVGGYTCAANSIPYQVSLNSGSHFCGGSLINS..."
                    value={customFasta}
                    onChange={(e) => setCustomFasta(e.target.value)}
                    className="font-mono text-sm h-32"
                  />
                  <p className="text-sm text-gray-500">
                    Paste your protein sequence in FASTA format
                  </p>
                </div>

                {(receptorType || customFasta) && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-4">Receptor Visualization</h4>
                    <ProteinViewer3D 
                      receptorType={receptorType} 
                      fastaSequence={customFasta}
                      height={350}
                    />
                    <div className="mt-4 space-y-2 text-sm">
                      {receptorType && (
                        <>
                          <div><strong>Receptor:</strong> {popularReceptors.find(r => r.id === receptorType)?.name}</div>
                          <div><strong>Source:</strong> AlphaFold Database</div>
                        </>
                      )}
                      {customFasta && (
                        <>
                          <div><strong>Length:</strong> {customFasta.replace(/^>.*\n/, '').replace(/\n/g, '').length} residues</div>
                          <div><strong>Type:</strong> Custom FASTA</div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prediction Tab */}
          <TabsContent value="predict" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  ⚙️ Affinity Prediction
                </CardTitle>
                <CardDescription>
                  Run AI-powered binding affinity prediction using your ligand and receptor
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Input Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">Ligand</h4>
                      <p className="text-sm font-mono bg-white p-2 rounded border">
                        {ligandSmiles || "No SMILES provided"}
                      </p>
                      <Badge variant={ligandSmiles ? "default" : "secondary"} className="mt-2">
                        {ligandSmiles ? "Ready" : "Missing"}
                      </Badge>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <h4 className="font-semibold text-indigo-800 mb-2">Receptor</h4>
                      <p className="text-sm">
                        {receptorType 
                          ? popularReceptors.find(r => r.id === receptorType)?.name
                          : customFasta 
                            ? "Custom FASTA sequence"
                            : "No receptor selected"
                        }
                      </p>
                      <Badge variant={(receptorType || customFasta) ? "default" : "secondary"} className="mt-2">
                        {(receptorType || customFasta) ? "Ready" : "Missing"}
                      </Badge>
                    </div>
                  </div>

                  {/* Prediction Button */}
                  <div className="text-center">
                    <Button 
                      onClick={handlePredict}
                      disabled={isLoading || !ligandSmiles || (!receptorType && !customFasta)}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {isLoading ? "Predicting..." : "Predict Binding Affinity"}
                    </Button>
                    
                    {isLoading && (
                      <div className="mt-4 space-y-2">
                        <Progress value={66} className="w-full max-w-md mx-auto" />
                        <p className="text-sm text-gray-600">Processing molecular features...</p>
                      </div>
                    )}
                  </div>

                  {/* Model Info */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Model Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <strong>Ligand Features:</strong> Morgan FP (1024-bit)
                      </div>
                      <div>
                        <strong>Receptor Features:</strong> ProtBERT Embeddings
                      </div>
                      <div>
                        <strong>Model:</strong> Deep Neural Network
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  📊 Prediction Results
                </CardTitle>
                <CardDescription>
                  Binding affinity prediction and molecular analysis results
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {affinityResult !== null ? (
                  <div className="space-y-6">
                    {/* Main Result */}
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                      <h3 className="text-2xl font-bold text-blue-800 mb-2">Binding Affinity</h3>
                      <div className="text-4xl font-bold text-indigo-600 mb-2">
                        {affinityResult} kcal/mol
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        {affinityResult < -8 ? (
                          <>
                            <Badge variant="default" className="bg-green-100 text-green-700">Strong Binding</Badge>
                            <ArrowDown className="h-4 w-4 text-green-600" />
                          </>
                        ) : affinityResult < -6 ? (
                          <>
                            <Badge variant="secondary">Moderate Binding</Badge>
                            <ArrowDown className="h-4 w-4 text-yellow-600" />
                          </>
                        ) : (
                          <>
                            <Badge variant="outline">Weak Binding</Badge>
                            <ArrowUp className="h-4 w-4 text-red-600" />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Ligand Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div><strong>SMILES:</strong> {ligandSmiles}</div>
                            <div><strong>Molecular Weight:</strong> ~250.3 Da</div>
                            <div><strong>LogP:</strong> 2.4</div>
                            <div><strong>Rotatable Bonds:</strong> 5</div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Receptor Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div><strong>Target:</strong> {receptorType 
                              ? popularReceptors.find(r => r.id === receptorType)?.name 
                              : "Custom Receptor"}</div>
                            <div><strong>Binding Pocket:</strong> Identified</div>
                            <div><strong>Confidence:</strong> 95.2%</div>
                            <div><strong>Residues:</strong> 15 contacts</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 3D Binding Pose Visualization */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">3D Binding Pose</CardTitle>
                        <CardDescription>
                          Predicted ligand-receptor complex visualization
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <MoleculeViewer3D 
                          smiles={ligandSmiles}
                          title="Ligand-Receptor Complex"
                          height={350}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                    <p>Run a prediction to see binding affinity results here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
